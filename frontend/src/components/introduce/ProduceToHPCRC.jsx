import React from "react";

const AboutSection = ({ darkMode }) => {
  return (
    <section
      id="page2"
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
      <div className="min-h-screen pt-16 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-center text-4xl text-white mb-20 mt-5">
            高性能计算研究中心（数据协同计算团队）
          </h1>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-3/5">
              <style jsx>{`
                .paragraph-spacing p {
                  margin-bottom: 2rem;
                  line-height: 2;
                }
              `}</style>

              <div className="prose prose-lg paragraph-spacing mt-3">
                <p className="text-white ">
                  高性能计算研究中心（数据协同计算团队）成立于2022年5月13日整合校“电子政务建模仿真国家工程实验室”，“舰船仿真研究中心”资源具备为高性能计算、数据协同、人工智能等领域大型科研项目提供技术支撑及服务能力。
                </p>
                <p className="text-white ">
                  计算研究中心整合了“舰船仿真研究中心”“电子政务建模仿真国家工程实验室”和核学院等高性能计算资源，具备了为开展高性能计算、分布式仿真等领域大型科研项目的分布式网络化实施开展等提供服务的能力。中心将面向一校四区服务，支撑学校各学科对高性能计算的需求，做好学校高性能计算资源有效整合和充分共享，为学校各学科提供高性能计算研究、分布式仿真算法、数字化建模技术等方面的智力支撑。
                </p>

                <p className="text-white ">
                  计算研究中心为学校船舶设计、流体计算、机械制造、天气预报、分子建模、核能仿真等领域的高性能计算起到重要支撑作用。
                </p>
              </div>
            </div>

            <div className="md:w-2/5 flex items-center justify-center">
              <div className="rounded-lg overflow-hidden shadow-xlg-white bg-blue-600 bg-opacity-2 p-1">
                <img
                  src="/HPCRC.png"
                  alt="高性能计算研究中心"
                  className="rounded shadow-lg w-full h-auto object-cover"
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
