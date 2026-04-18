import { nodeTemplates } from '../../templates/nodeTemplates';

export default function TemplateSidebar({ onAddNode }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span>Components</span>
      </div>
      <div style={styles.list}>
        {nodeTemplates.map((tpl) => (
          <div
            key={tpl.id}
            style={styles.item}
            onClick={() => onAddNode(tpl)}
            title={tpl.description}
          >
            <div style={{ ...styles.iconBox, background: tpl.bgColor, color: tpl.color }}>
              <span style={styles.icon}>{tpl.icon}</span>
            </div>
            <div style={styles.meta}>
              <div style={styles.name}>{tpl.title}</div>
              <div style={styles.desc}>{tpl.description}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        <div style={styles.footerNote}>
          Click any component to add it to the canvas
        </div>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 180, flexShrink: 0,
    borderRight: '0.5px solid var(--border-tertiary)',
    background: 'var(--bg-secondary)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '10px 12px 6px',
    fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    borderBottom: '0.5px solid var(--border-tertiary)',
  },
  list: { flex: 1, overflowY: 'auto', padding: '6px 6px' },
  item: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 8px', borderRadius: 7, marginBottom: 2,
    cursor: 'pointer', transition: 'background var(--t-base)',
    userSelect: 'none',
  },
  iconBox: {
    width: 28, height: 28, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 13,
  },
  icon: { lineHeight: 1 },
  meta: { flex: 1, overflow: 'hidden' },
  name: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
  desc: { fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  footer: { padding: '10px 12px', borderTop: '0.5px solid var(--border-tertiary)' },
  footerNote: { fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 },
};