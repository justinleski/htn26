import { Route, Routes } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { WelcomePage } from "./pages/WelcomePage";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<WelcomePage />} />
      </Route>
    </Routes>
  );
}
