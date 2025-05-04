import DocSideBar from "./document/SideBar";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

function FileShowPage() {
  const [baseinfo, setBaseInfo] = useState({});
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("docId");
  const baseId = searchParams.get("baseId");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 获取知识库信息
  const GetBaseInfo = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/knowledge/info/${baseId}`, {
        headers: {
          Authorization: localStorage.auth,
        },
      });
      const data = res.data.data || {};
      setBaseInfo(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseId) {
      GetBaseInfo();
    }
  }, [baseId]);

  useEffect(() => {
    console.log("docId:", docId);
    console.log("baseId:", baseId);
  }, [docId, baseId]);

  useEffect(() => {
    console.log("Base info updated:", baseinfo);
  }, [baseinfo]);

  return (
    <div className="flex flex-row w-full h-full">
      {/*侧边栏 */}
      <div className="flex flex-row h-screen mx-4">
        <div className="flex flex-col h-full w-60 mr-10">
          <div className="flex flex-col h-1/5 items-center justify-center">
            <p className="text-lg font-bold">{baseinfo.base_name}</p>
            <p className="text-gray-600">{baseinfo.base_desc}</p>
          </div>
          <div
            className="flex-grow border-t border-gray-300 border-dashed -mt-5"
            style={{
              borderTopStyle: "dashed",
              borderTopWidth: "2.2px",
              borderImage: "none",
            }}
          ></div>
          <div className="flex flex-col h-4/5 overflow-x-hidden justify-between">
            <DocSideBar baseId={baseId} />
            <Button
              type="primary"
              className="mb-14 mx-2"
              onClick={() => navigate("/knowledge")}
            >
              返回主页
            </Button>
          </div>
        </div>
        {/*主内容区*/}
        {/*内容切片展示区 */}
        {/*搜索查找区 */}
      </div>
    </div>
  );
}

export default FileShowPage;
