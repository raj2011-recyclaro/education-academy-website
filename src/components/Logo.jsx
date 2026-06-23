import { Link } from "react-router-dom";
import logoUrl from "../assets/logo.svg";

export default function Logo({ className = "", showTagline = false, variant = "default" }) {
  const classes = ["logo-link", `logo-${variant}`, className].filter(Boolean).join(" ");

  return (
    <Link className={classes} to="/" aria-label="UpSkillr.in home">
      <img className="logo-image" src={logoUrl} alt="UpSkillr.in logo" />
      {showTagline && <span className="logo-tagline">upgrade. upskill. uplift.</span>}
    </Link>
  );
}
