import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div>
      <Link to="/Admin">Admin</Link>
      <Link to="/Game">Game</Link>
    </div>
  );
}
