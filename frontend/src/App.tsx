import { useEffect, useState } from "react";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectGuidePage } from "./pages/ProjectGuidePage";

function guideIsActive() {
  return window.location.hash === "#/guide";
}

export default function App() {
  const [isGuide, setIsGuide] = useState(guideIsActive);
  useEffect(() => {
    const onHashChange = () => setIsGuide(guideIsActive());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return (
    <DashboardLayout currentPage={isGuide ? "guide" : "overview"}>
      {isGuide ? <ProjectGuidePage /> : <DashboardPage />}
    </DashboardLayout>
  );
}
