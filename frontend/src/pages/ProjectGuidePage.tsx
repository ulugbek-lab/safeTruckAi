import {
  ArrowRight,
  BookOpen,
  Camera,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Database,
  ExternalLink,
  HardHat,
  Info,
  ScanEye,
  ShieldCheck,
  Users,
} from "lucide-react";
import "../project-guide.css";

const assets = {
  dashboard:
    "https://raw.githubusercontent.com/ulugbek-lab/safeTruckAi/develop/docs/assets/dashboard.png",
  history:
    "https://raw.githubusercontent.com/ulugbek-lab/safeTruckAi/develop/docs/assets/incident-history.png",
  review:
    "https://raw.githubusercontent.com/ulugbek-lab/safeTruckAi/develop/docs/assets/review-demo.png",
};

const steps = [
  {
    icon: Camera,
    heading: "Camera input",
    body: "A locally connected webcam supplies frames through OpenCV. The camera does not stream to the dashboard.",
  },
  {
    icon: Users,
    heading: "Person tracking",
    body: "A general YOLO detector tracks people with ByteTrack and assigns temporary tracking IDs.",
  },
  {
    icon: HardHat,
    heading: "PPE recognition",
    body: "A separately trained YOLO model predicts helmet, vest, no_helmet, and no_vest labels.",
  },
  {
    icon: ShieldCheck,
    heading: "Evidence confirmation",
    body: "PPE evidence is associated with each tracked worker. Missing-PPE alerts require observations across multiple frames.",
  },
  {
    icon: Database,
    heading: "Incident storage",
    body: "Confirmed potential incidents are sent to FastAPI and stored in PostgreSQL with a timestamp and review status.",
  },
  {
    icon: ChartNoAxesCombined,
    heading: "Dashboard review",
    body: "The React dashboard displays incident trends, filters, details, and human review controls.",
  },
];

export function ProjectGuidePage() {
  return (
    <div className="guide-page">
      <div className="guide-hero">
        <div className="guide-hero-copy">
          <div className="eyebrow">PROJECT WALKTHROUGH</div>
          <h1>How SafeTruckAI works</h1>
          <p>
            Explore the computer vision pipeline behind this dashboard and learn
            how to review potential workplace PPE incidents.
          </p>
          <div className="guide-hero-actions">
            <a className="button primary" href="#/overview">
              Explore dashboard <ArrowRight size={15} />
            </a>
            <a
              className="button secondary"
              href="https://github.com/ulugbek-lab/safeTruckAi"
              target="_blank"
              rel="noreferrer"
            >
              View source <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div
          className="guide-hero-visual"
          aria-label="Simplified vision-to-dashboard architecture"
        >
          <div>
            <Camera size={22} />
            <span>Local camera</span>
          </div>
          <ArrowRight size={17} />
          <div>
            <ScanEye size={22} />
            <span>YOLO + tracking</span>
          </div>
          <ArrowRight size={17} />
          <div>
            <ClipboardCheck size={22} />
            <span>Incident review</span>
          </div>
        </div>
      </div>

      <section className="guide-section guide-video-section" aria-labelledby="guide-video-title">
        <div className="guide-section-title">
          <span className="guide-section-icon"><ScanEye size={19} /></span>
          <div>
            <div className="eyebrow">VIDEO / ILLUSTRATIVE SCENARIO</div>
            <h2 id="guide-video-title">See a PPE safety scenario</h2>
          </div>
        </div>
        <p className="guide-intro">This short construction-site clip illustrates how a helmet safety warning can appear in a monitored workplace. It is an illustrative example, not a recording or benchmark of SafeTruckAI's actual YOLO predictions.</p>
        <div className="guide-video-player">
          <video controls playsInline preload="metadata" poster="" aria-label="Illustrative construction-site helmet safety warning video">
            <source src={`${import.meta.env.BASE_URL}videos/safetyDetector.mp4`} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
        </div>
        <p className="guide-video-caption">Illustrative demonstration video · Not live inference · Confidence labels in this clip are not SafeTruckAI model measurements.</p>
      </section>

      <section className="guide-section" aria-labelledby="guide-system-title">
        <div className="guide-section-title">
          <span className="guide-section-icon">
            <ScanEye size={19} />
          </span>
          <div>
            <div className="eyebrow">01 / COMPUTER VISION</div>
            <h2 id="guide-system-title">From camera to incident</h2>
          </div>
        </div>
        <p className="guide-intro">
          SafeTruckAI uses two models: one to track people and another to
          recognize protective equipment. Its incident logic confirms
          missing-equipment evidence across frames before sending an alert.
        </p>
        <div className="guide-step-grid">
          {steps.map((step, index) => (
            <article className="guide-step" key={step.heading}>
              <div className="guide-step-top">
                <span className="guide-step-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <step.icon size={20} />
              </div>
              <h3>{step.heading}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
        <div className="guide-info">
          <Info size={18} />
          <p>
            <strong>What this demo does not do:</strong> This website does not
            run camera inference or accept uploads. The trained PPE model runs
            separately in a local Python process. A single frame is not the same
            as a confirmed multi-frame alert.
          </p>
        </div>
      </section>

      <section
        className="guide-section"
        aria-labelledby="guide-dashboard-title"
      >
        <div className="guide-section-title">
          <span className="guide-section-icon">
            <BookOpen size={19} />
          </span>
          <div>
            <div className="eyebrow">02 / USER GUIDE</div>
            <h2 id="guide-dashboard-title">Explore the dashboard</h2>
          </div>
        </div>
        <div className="guide-feature-grid">
          <article className="guide-image-card">
            <img
              src={assets.dashboard}
              loading="lazy"
              alt="Actual SafeTruckAI dashboard screenshot with incident summary cards and analytics charts"
            />
            <div className="guide-image-caption">
              <span>Actual application screenshot</span>
              <h3>Overview and analytics</h3>
              <p>
                Review incident counts, pending reviews, daily trends, and the
                distribution of missing-helmet and missing-vest events.
              </p>
              <a href="#/overview">
                Open dashboard <ArrowRight size={14} />
              </a>
            </div>
          </article>
          <article className="guide-image-card">
            <img
              src={assets.history}
              loading="lazy"
              alt="Actual SafeTruckAI incident history table with filters and review statuses"
            />
            <div className="guide-image-caption">
              <span>Actual application screenshot</span>
              <h3>Incident history</h3>
              <p>
                Filter events by violation type and review status, change
                sorting, and open an incident to see its details.
              </p>
              <a href="#incident-history">
                View incident history <ArrowRight size={14} />
              </a>
            </div>
          </article>
        </div>
        <div className="guide-howto">
          <h3>How to review an incident</h3>
          <ol>
            <li>
              Open <a href="#incident-history">Incident history</a> and choose a
              record.
            </li>
            <li>
              Check its violation type, temporary tracking ID, and timestamp.
            </li>
            <li>
              Decide whether to mark it <strong>Reviewed</strong> or{" "}
              <strong>Dismissed</strong>, then save.
            </li>
            <li>
              Use the status filter to find records still marked{" "}
              <strong>Pending</strong>.
            </li>
          </ol>
          <p>
            Some deployments use sample dashboard data. Demo records are
            examples, not independently verified safety violations.
          </p>
        </div>
      </section>

      <section
        className="guide-section"
        aria-labelledby="guide-technical-title"
      >
        <div className="guide-section-title">
          <span className="guide-section-icon">
            <Code2 size={19} />
          </span>
          <div>
            <div className="eyebrow">03 / UNDER THE HOOD</div>
            <h2 id="guide-technical-title">Technology and limitations</h2>
          </div>
        </div>
        <div className="guide-tech-grid">
          <div>
            <strong>Computer vision</strong>
            <span>Python · OpenCV · YOLO · ByteTrack · PyTorch</span>
          </div>
          <div>
            <strong>Backend</strong>
            <span>FastAPI · SQLModel / SQLAlchemy · PostgreSQL</span>
          </div>
          <div>
            <strong>Frontend</strong>
            <span>React · TypeScript · Vite · Recharts</span>
          </div>
        </div>
        <div className="guide-info guide-caution">
          <Info size={18} />
          <p>
            The system detects <strong>potential</strong> missing protective
            equipment for human review. Lighting, occlusion, model accuracy, and
            temporary tracking IDs limit reliability. It does not identify
            individuals or provide safety certification.
          </p>
        </div>
      </section>
      <div className="guide-end">
        <div>
          <CheckCircle2 size={20} />
          <strong>Ready to explore actual incident views?</strong>
        </div>
        <a className="button primary" href="#/overview">
          Go to dashboard <ArrowRight size={15} />
        </a>
      </div>
    </div>
  );
}
