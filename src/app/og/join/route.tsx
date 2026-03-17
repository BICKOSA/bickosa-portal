import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#0d1b3e",
        color: "#ffffff",
        padding: "64px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          color: "#c9a84c",
          fontSize: 30,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        BICKOSA
      </div>
      <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
        Join the BCK Alumni Community
      </div>
      <div style={{ fontSize: 28, marginTop: 20, color: "#d4dff0" }}>
        Bishop Cipriano Kihangire Old Students Association
      </div>
    </div>,
    size,
  );
}
