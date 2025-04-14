import React from "react";
import "./styles/main.css";
import AboutSection from "./introduce/AboutSection";
import TechnologySection from "./introduce/TechnologySection";
import JoinSection from "./introduce/JoinSection";
import IntroduceToHPCRC from "./introduce/IntroduceToHPCRC";
import MainFunction from "./introduce/MainFunction";
import Model from "./introduce/Model";
import TechAdvan from "./introduce/TechAdvan";

function IntroducePage() {
  return (
    <div>
      <main className="scroll-container ">
        <AboutSection />
        <IntroduceToHPCRC />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-0 mb-5 px-[3vh]">
          <MainFunction />
          <TechAdvan />
        </div>
        <TechnologySection />
        <Model />
        <JoinSection />
      </main>
    </div>
  );
}

export default IntroducePage;
