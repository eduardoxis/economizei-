const paths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  list: 'M9 6h12M9 12h12M9 18h12M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2',
  calculator: 'M5 3h14v18H5zM8 7h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 3h1m6 0h1',
  shield: 'M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10z M9 12l2 2 4-4',
  expand: 'M8 3H3v5m13-5h5v5m0 8v5h-5M3 16v5h5',
  close: 'M6 6l12 12M18 6 6 18',
  fuel: 'M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M2 21h14M4 10h10m0 4h2a2 2 0 0 1 2 2v2a1.5 1.5 0 0 0 3 0v-7l-4-4',
  pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  search: 'M16 16l4 4M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
} as const;

export default function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

