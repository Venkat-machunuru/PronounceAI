import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute
  from "./components/ProtectedRoute";

import DashboardPage
  from "./pages/DashboardPage";

import LoginPage
  from "./pages/LoginPage";

import SignupPage
  from "./pages/SignupPage";


function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/signup"
        element={<SignupPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}


export default App;