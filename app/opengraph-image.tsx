import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Amman Vedi';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1E3A8A',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      />
    ),
    {
      ...size,
    }
  );
}
