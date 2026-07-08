import bg from "@/assets/realistic-solar-bg.jpg";

const SolarMatrixBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <img
      src={bg}
      alt="Realistic solar system with sun and planets"
      className="absolute inset-0 w-full h-full object-cover animate-[kenburns_40s_ease-in-out_infinite_alternate]"
      loading="lazy"
      width={1920}
      height={1280}
    />
    <div className="absolute inset-0 bg-background/20" />
    <style>{`@keyframes kenburns{0%{transform:scale(1)}100%{transform:scale(1.08)}}`}</style>
  </div>
);

export default SolarMatrixBackground;
