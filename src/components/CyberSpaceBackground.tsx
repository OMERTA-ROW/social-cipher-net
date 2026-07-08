import bg from "@/assets/realistic-space-bg.jpg";

const CyberSpaceBackground = () => (
  <>
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center animate-[kenburns_30s_ease-in-out_infinite_alternate]"
      style={{ backgroundImage: `url(${bg})` }}
    />
    <div className="fixed inset-0 -z-10 bg-background/40" />
    <style>{`@keyframes kenburns{0%{transform:scale(1)}100%{transform:scale(1.08)}}`}</style>
  </>
);

export default CyberSpaceBackground;
