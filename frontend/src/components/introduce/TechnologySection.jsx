import React from 'react';
import { Code, Zap, Database, Cpu } from 'lucide-react';

const TechnologySection = () => {
  return (
    <section 
      id="page3" 
      style={{
        backgroundColor: 'white',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: '100%',
      }}
    >
      <div className="mt-0 mb-0 py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
      <style jsx>{`
                .paragraph-spacing p {
                  margin-bottom: 2rem; 
                  line-height: 2;
                }
              `}</style>
              <div className="flex items-center mb-4 mt-1">
            
            <h2 className="text-2xl  ">技术栈</h2>
          </div>

            <div className="col-span-12 md:col-span-8 bg-opacity-90 rounded-lg p-4 border border-gray-300" paragraph-spacing
                 style={{backgroundColor: 'rgba(239, 246, 255, 0.9)'}}>
             
              <div className="flex items-center  gap-1">
                <span>
              <svg t="1744468544728" className="icon w-6 h-6" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="39839" ><path d="M512 88.576C278.129778 88.576 88.576 278.129778 88.576 512S278.129778 935.424 512 935.424 935.424 745.870222 935.424 512 745.870222 88.576 512 88.576z m0 158.776889a26.453333 26.453333 0 1 1 0 52.906667 26.453333 26.453333 0 1 1 0-52.906667z m78.990222 529.294222h-157.980444a26.453333 26.453333 0 1 1 0-52.906667h51.285333v-266.723555h-52.110222a26.453333 26.453333 0 1 1 0-52.935111h78.563555a26.453333 26.453333 0 0 1 26.453334 26.453333v293.176889h53.76c14.648889 0 27.306667 11.832889 27.306666 26.453333 0 14.648889-12.657778 26.481778-27.306666 26.481778z" fill="#2c5282" p-id="39840"></path></svg>
              </span>
                <p className="text-blue-700 "><strong>平台采用全链路MIT开源技术栈，从基础设施到应用层均使用开放、透明的开源组件，确保系统安全可控、自主可控。</strong> </p>
              </div>
              <ul className="list-inside space-y-1 mt-2">
                <li>✓ 全部组件均采用 MIT 许可证，支持商用且无法律风险</li>
                <li>✓ 完整适配国产化基础设施，支持海光、龙芯等硬件架构</li>
                <li>✓ 兼容国产操作系统，已在统信UOS、麒麟等环境下稳定运行</li>
                <li>✓ 支持主流国产GPU及异构计算平台，可无缝替换计算资源</li>
              </ul>
              </div>

              
              <div className="gap-x-3 gap-y-0 pt-3 grid grid-cols-1  lg:grid-cols-4 ">
              <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg ">
             <a href="https://gin-gonic.com/" target="_blank" className="flex flex-col items-center">
             <div className="flex ">
            <img src="https://raw.githubusercontent.com/gin-gonic/logo/master/color.png" alt="Gin" className="w-6 h-8 mb-1" />
            <span className=" ml-1 text-blue-700 font-bold mt-1">Gin</span>
            </div>
            </a>
            <p className="text-sm">Go 语言 Web 框架，性能极高，API 简洁，适合 RESTful API 和微服务，支持路由、中间件、JSON 验证，内存占用低，理想用于高并发场景。</p>
             </div>


                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">

                <a href="https://gorm.io/" target="_blank" className="flex flex-col">
                <div className="flex ">
          
                  <img src="https://gorm.io/apple-touch-icon.png" alt="GORM" className="w-7 h-7 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">GORM</span>
                  </div>
                  </a>
                
                  <p className="text-sm">Go 语言 ORM 库，支持多种数据库，简化 CRUD、迁移、关联操作，链式 API 易读，支持事务和预加载，适合快速开发。</p>
                </div>
                
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://grpc.io/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/grpc.png" alt="gRPC" className="w-7 h-7 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">gRPC</span>
                  </div>
                  </a>
                
                  <p className="text-sm">Google 开发的高性能 RPC 框架，基于 HTTP/2 和 Protocol Buffers，支持多语言，低延迟高吞吐，适合分布式系统和微服务。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://www.postgresql.org/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/postgresql.png" alt="PostgreSQL" className="w-8 h-8 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">PostgreSQL</span>
                  </div>
                  </a>
                  <p className="text-sm">开源关系型数据库，功能强大，支持复杂查询、JSONB、地理空间数据，稳定可靠，广泛用于企业级应用。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://www.ferretdb.com/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/FerretDB.jpg" alt="FerretDB" className="w-8 h-8 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">FerretDB</span>
                  </div>
                  </a>
                  <p className="text-sm">MongoDB 兼容的开源替代，基于 PostgreSQL 存储，提供熟悉的 NoSQL 接口，适合混合数据库场景。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://valkey.io/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/valkey.png" alt="Valkey" className="w-8 h-7 mb-2" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">Valkey</span>
                  </div>
                  </a>
                  <p className="text-sm">Redis 分支的键值存储，性能高，支持多种数据结构，适合缓存、消息队列，由 Linux 基金会维护。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://milvus.io/zh "  target="_blank" className="flex flex-col items-center">
                  
                <div className="flex ">
                  <img src="/milvus.png" alt="Milvus" className="w-9 h-9 mb-0" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">Milvus</span>
                  </div>
                  </a>
                  <p className="text-sm">开源向量数据库，专为高维向量存储和搜索设计，适合 AI 驱动的相似性搜索和机器学习应用。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://www.langchain.com/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/langchain.jpg" alt="LangChain" className="w-8 h-8 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">LangChain</span>
                  </div>
                  </a>
                  <p className="text-sm">LLM 应用框架，支持 Python 和 JavaScript，连接外部数据，管理上下文，适合构建对话系统和知识检索。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://www.docker.com/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/docker_.png" alt="Docker" className="w-7 h-7 mb-2" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">Docker</span>
                  </div>
                  </a>
                  <p className="text-sm">容器化平台，打包应用及其依赖，确保环境一致，支持微服务和 CI/CD，简化部署流程。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-6 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://caddyserver.com/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/caddy.png" alt="Caddy" className="w-7 h-7 md-2" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">Caddy</span>
                  </div>
                  </a>
                  <p className="text-sm">现代化 Web 服务器，自动 HTTPS，支持 HTTP/3，配置简单，适合静态托管和反向代理。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://react.dev/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="/logo_light.svg" alt="React" className="w-7 h-7 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">React</span>
                  </div>
                  </a>
                  <p className="text-sm">JavaScript 库，构建组件化用户界面，虚拟 DOM 优化性能，适合单页应用和动态前端开发。</p>
                </div>
                <div className="mx-0 mb-0 flex flex-col items-start py-5 px-4 sm:px-6 lg:px-8 m-[3vh] border border-gray-500 rounded-lg">
                <a href="https://tailwindcss.com/"  target="_blank" className="flex flex-col items-center">
                <div className="flex ">
                  <img src="https://tailwindcss.com/favicons/apple-touch-icon.png?v=4" alt="Tailwind CSS" className="w-8 h-8 mb-1" />
                  <span className="ml-1 text-blue-700 font-bold mt-1">Tailwind CSS</span>
                  </div>
                  </a>
                  <p className="text-sm">实用优先 CSS 框架，通过类名快速构建响应式界面，高度可定制，减少自定义 CSS 需求。</p>
              </div>
            </div>
            </div>
      
  
    </section>
  );
};

export default TechnologySection;
