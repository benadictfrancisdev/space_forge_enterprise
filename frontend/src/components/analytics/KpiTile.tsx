import KPICard from "@/components/data-agent/charts/KPICard";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  color?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

// Thin wrapper around the existing KPICard so all Analytics Hub tiles
// share a single import path and naming.
const KpiTile = (props: Props) => <KPICard {...props} />;

export default KpiTile;
