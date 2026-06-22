import type { Metadata } from "next";
import { GamePreview } from "@/features/campus-energy/components/game-preview";

export const metadata: Metadata = {
  title: "캠퍼스 에너지 RPG 프로토타입",
  description: "Mapbox 캠퍼스 허브와 분리형 자동 사냥 화면을 결합한 인터랙션 프로토타입",
};

export default function GamePreviewPage() {
  return (
    <GamePreview
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
    />
  );
}
