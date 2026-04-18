import path from 'path';
import File from '../models/File.js';
import FileVersion from '../models/FileVersion.js';

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const map = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    txt: 'text',
    sh: 'bash',
  };

  return map[ext] || ext || 'unknown';
}

async function buildRoomFiles(roomId, search) {
  const query = { roomId, isDeleted: false };

  if (search) {
    query.fileName = { $regex: search, $options: 'i' };
  }

  const files = await File.find(query)
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'name email');

  return Promise.all(
    files.map(async (file) => {
      const latestVersion = await FileVersion.findOne({ fileId: file._id })
        .sort({ versionNumber: -1 })
        .select('versionNumber changeNote createdAt');

      return {
        _id: file._id,
        roomId: file.roomId,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        filePath: file.filePath,
        uploadedBy: file.uploadedBy,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        latestVersion: latestVersion?.versionNumber || 1,
        lastChange: latestVersion?.changeNote || 'Initial upload',
      };
    })
  );
}

export const uploadFile = async (req, res) => {
  try {
    const { fileName, fileContent, roomId, uploadedBy, changeNote } = req.body;

    if (!fileName || !fileContent || !roomId || !uploadedBy) {
      return res.status(400).json({
        message: 'fileName, fileContent, roomId and uploadedBy are all required',
      });
    }

    const fileSize = Buffer.byteLength(fileContent, 'utf8');
    const fileType = getFileType(fileName);
    const filePath = `${roomId}/${fileName}`;

    const existingFile = await File.findOne({
      roomId,
      fileName,
      isDeleted: false,
    });

    if (existingFile) {
      const lastVersion = await FileVersion.findOne({ fileId: existingFile._id }).sort({
        versionNumber: -1,
      });

      const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 2;

      const version = await FileVersion.create({
        fileId: existingFile._id,
        versionNumber,
        filePath,
        uploadedBy,
        changeNote: changeNote || `Version ${versionNumber}`,
      });

      existingFile.filePath = filePath;
      existingFile.fileSize = fileSize;
      await existingFile.save();

      return res.status(200).json({
        message: 'New version uploaded successfully',
        file: existingFile,
        version,
      });
    }

    const file = await File.create({
      roomId,
      fileName,
      fileType,
      fileSize,
      filePath,
      uploadedBy,
      isDeleted: false,
    });

    const version = await FileVersion.create({
      fileId: file._id,
      versionNumber: 1,
      filePath,
      uploadedBy,
      changeNote: changeNote || 'Initial upload',
    });

    return res.status(201).json({
      message: 'File uploaded successfully',
      file,
      version,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

export const getFilesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { search } = req.query;

    const files = await buildRoomFiles(roomId, search);

    return res.status(200).json({ files });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({ _id: fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.isDeleted = true;
    await file.save();

    return res.status(200).json({
      message: `"${file.fileName}" deleted successfully`,
      fileId: file._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

export const createFileVersion = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { fileContent, uploadedBy, changeNote } = req.body;

    if (!fileContent || !uploadedBy) {
      return res.status(400).json({
        message: 'fileContent and uploadedBy are required',
      });
    }

    const file = await File.findOne({ _id: fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const lastVersion = await FileVersion.findOne({ fileId }).sort({ versionNumber: -1 });
    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
    const filePath = `${file.roomId}/${file.fileName}`;
    const fileSize = Buffer.byteLength(fileContent, 'utf8');

    const version = await FileVersion.create({
      fileId,
      versionNumber,
      filePath,
      uploadedBy,
      changeNote: changeNote || `Version ${versionNumber}`,
    });

    file.filePath = filePath;
    file.fileSize = fileSize;
    await file.save();

    return res.status(201).json({
      message: 'File version created successfully',
      version,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

export const getFileVersions = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({ _id: fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const versions = await FileVersion.find({ fileId })
      .sort({ versionNumber: -1 })
      .populate('uploadedBy', 'name email');

    return res.status(200).json({ versions });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({ _id: fileId, isDeleted: false }).populate(
      'uploadedBy',
      'name email'
    );

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const versions = await FileVersion.find({ fileId: file._id })
      .sort({ versionNumber: -1 })
      .populate('uploadedBy', 'name email');

    return res.status(200).json({
      file,
      versions,
      totalVersions: versions.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

export const getFileLink = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({ _id: fileId, isDeleted: false });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    return res.status(200).json({
      fileId: file._id,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      fileUrl: `${baseUrl}/api/files/download/${file._id}`,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};
