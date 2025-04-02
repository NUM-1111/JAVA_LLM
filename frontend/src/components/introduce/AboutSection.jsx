import React from "react";

const AboutSection = ({ darkMode }) => {
  return (
    <section
      id="page1"
      className={`page ${darkMode ? "text-white" : "text-gray-800"}`}
      style={{
        background: ` url('/blueblue.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div className=" min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto ">
          <div className="text-center mb-5">
            <h1 className="text-3xl text-white mb-3 font-custom">关于我们</h1>
            <div className="w-50 h-0.5 bg-white mx-auto"></div>
          </div>
          <style jsx>{`
            .paragraph-spacing p {
              margin-bottom: 2rem;
              line-height: 2;
            }
          `}</style>

          <div className="prose prose-lg mx-auto mb-8 paragraph-spacing">
            <h1 className="text-center text-4xl text-white mb-1">
              "深蓝智算"智能体平台
            </h1>
            <p className="text-white ">
              该平台是以海光DCU为代表的国产GPU采用GPGPU通用加速架构打造的智能体平台，其基于DeepSeek大模型技术并具备与主流AI生态兼容的能力。
            </p>

            <p className="text-white ">
              系统由哈尔滨工程大学“新玖零幺”信创工作室（拓荒者社团）与计算机科学与技术学院数据协同计算团队（高性能计算研究中心）合作，并成功在国产海光DCU（8卡Z100L）机器上完成了DeepSeek-R1-Distill-Llama-70B以及QwQ-32B大模型的本地化部署。这一成果标志着我校国产AI大模型与国产算力协同取得了重要突破。
            </p>

            <p className="text-white ">
              平台致力于在探索国产化自主安全可控技术，各个领域需通过本地部署实现数据不出域。
            </p>

            <p className="text-white ">
              未来，信创工作室将继续依托国产DCU硬件平台与DeepSeek、QwQ等开源模型的技术优势，面向船舶水声等对数据安全要求极高的领域，构建自主可控的行业知识库。通过整合领域专业知识、历史案例与实时数据，实现模型在声呐信号分析、海洋环境建模等场景中的精准推理与安全应用，为船舶工业智能化提供国产化技术支撑，加速形成覆盖“硬件-算法-场景”的全链条自主创新能力，发挥学生社团能量，助力我校科研在船海领域的高质量发展。
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center space-y- md:space-y-0 md:space-x-16 mb-0">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg">
                <img
                  src="/InstituteofComputerScience.png"
                  alt="InstituteofComputerScience"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg">
                <img
                  src="/InstituteofSoftwareEngineering.png"
                  alt="InstituteofSoftwareEngineering"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg">
                <img
                  src="/InstituteofConfidentiality.png"
                  alt="InstituteofConfidentiality"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
