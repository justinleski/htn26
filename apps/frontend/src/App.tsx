import { Route, Routes } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { WelcomePage } from "./pages/WelcomePage";
import { InsightsPage } from "./pages/InsightsPage";
import { CampaignPage } from "./pages/CampaignPage";
import { CreativeTestingPage } from "./pages/CreativeTestingPage";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/campaign" element={<CampaignPage />} />
        <Route path="/creative-testing" element={<CreativeTestingPage />} />
      </Route>
    </Routes>
  );
}
