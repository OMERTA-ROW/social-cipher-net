import bg from "@/assets/realistic-space-bg.jpg";

const RealisticSpaceBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <img
      src={bg}
      alt="Realistic deep space cosmic nebula"
      className="absolute inset-0 w-full h-full object-cover animate-[kenburns_40s_ease-in-out_infinite_alternate]"
      loading="lazy"
      width={1920}
      height={1280}
    />
    <div className="absolute inset-0 bg-background/30" />
    <style>{`@keyframes kenburns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.1) translate(-2%,-2%)}}`}</style>
  </div>
);

export default RealisticSpaceBackground;
