import { Link } from "react-router";
import { EmptyState } from "../components/ui";

export default function NotFound() {
  return (
    <div className="page">
      <EmptyState title="Page not found">
        <Link to="/">Go back to Today</Link>
      </EmptyState>
    </div>
  );
}
