import { Route, Routes } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { WelcomePage } from "./pages/WelcomePage";
<<<<<<< HEAD
=======
import { DashboardPage } from "./pages/DashboardPage";
>>>>>>> origin/main
import { InsightsPage } from "./pages/InsightsPage";
import { CampaignPage } from "./pages/CampaignPage";
import { CreativeTestingPage } from "./pages/CreativeTestingPage";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<WelcomePage />} />
<<<<<<< HEAD
=======
        <Route path="/dashboard" element={<DashboardPage />} />
>>>>>>> origin/main
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/campaign" element={<CampaignPage />} />
        <Route path="/creative-testing" element={<CreativeTestingPage />} />
      </Route>
    </Routes>
  );
}
