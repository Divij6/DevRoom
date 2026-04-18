import { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";

import LoginPage from "./components/Auth/LoginPage";
import RegisterPage from "./components/Auth/RegisterPage";

import Sidebar from "./components/Sidebar/Sidebar";
import RoomWorkspace from "./components/Layout/RoomWorkspace";

import "./index.css";

function AppInner() {
  const { user, loading } = useAuth();

  const [screen, setScreen] = useState("login"); 
  // "login" | "register"

  // Loading screen
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh"
        }}
      >
        <span className="spinner" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return screen === "login" ? (
      <LoginPage
        onGoRegister={() => setScreen("register")}
      />
    ) : (
      <RegisterPage
        onGoLogin={() => setScreen("login")}
      />
    );
  }

  // Logged in layout
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden"
      }}
    >
      <Sidebar />
      <RoomWorkspace />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <AppInner />
      </RoomProvider>
    </AuthProvider>
  );
}