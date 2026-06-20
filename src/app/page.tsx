import { CampusEnergyApp } from "@/features/campus-energy/components/campus-energy-app";

export default function Home() {
  return (
    <CampusEnergyApp
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
    />
  );
}
