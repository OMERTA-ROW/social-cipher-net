import bg from "@/assets/realistic-cyber-bg.jpg";

const MatrixOverlay = () => (
  <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
    <img
      src={bg}
      alt="Realistic cyberpunk matrix digital cityscape"
      className="absolute inset-0 w-full h-full object-cover animate-[kenburns_45s_ease-in-out_infinite_alternate]"
      loading="lazy"
      width={1920}
      height={1280}
    />
    <div className="absolute inset-0 bg-black/40" />
    <style>{`@keyframes kenburns{0%{transform:scale(1)}100%{transform:scale(1.1)}}`}</style>
  </div>
);

export default MatrixOverlay;
