import DocSideBar from "./document/SideBar";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Input, Space, Card, Pagination } from "antd";
import { FileTextOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import axios from "axios";
import { useEffect, useState } from "react";

const { Search } = Input;
const onSearch = (value, _e, info) =>
  console.log(info === null || info === void 0 ? void 0 : info.source, value);

function FileShowPage() {
  const [baseinfo, setBaseInfo] = useState({});
  const [docName, setDocName] = useState("");
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("docId");
  const baseId = searchParams.get("baseId");
  const navigate = useNavigate();
  const [docSlice, setDocSlice] = useState([]);
  const [totalSlice, setTotalSlice] = useState(0); // 总数
  const [page, setPage] = useState(1); // 当前页码
  const [loading, setLoading] = useState(false);
  const [searchvalue, setSearchvalue] = useState("");

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

  //获取文档名称
  const GetDocName = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/knowledge/document/${docId}`, {
        headers: {
          Authorization: localStorage.auth,
        },
      });
      const data = res.data.data;
      setDocName(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  //获取文档切片
  const GetDocSlice = async (searchvalue) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/knowledge/document/detail?docId=${docId}&search=${searchvalue}&limit=10&offset=${
          (page - 1) * 10
        }`,
        {
          headers: {
            Authorization: localStorage.auth,
          },
        }
      );
      const data = res.data;
      setDocSlice(data.data || []);
      setTotalSlice(data.total || 0);
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
    if (docId) {
      GetDocName();
      GetDocSlice();
    }
  }, [docId, page]);
    
    const handlePageChange = (pageNum) => {
      setPage(pageNum);
    };

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
      </div>

      {/*主内容区*/}
      <div className="flex flex-col w-full h-full">
        {/*文件标题+搜索框*/}
        <div className="flex flex-row w-full mt-12 h-16 items-center justify-between border-b border-gray-300">
          <div className="flex flex-row items-center">
            <ArrowLeftOutlined onClick={() => navigate(-1)} />
            <FileTextOutlined className="ml-2 text-gray-600" />
            <p className="text-gray-600 ml-2">{docName}</p>
          </div>
          {/* 搜索框 */}
          <Space direction="vertical" size="middle" className="mr-10">
            <Search
              placeholder="查找切片"
              onSearch={onSearch}
              enterButton
              onChange={(e) => setSearchvalue(e.target.value)}
              onPressEnter={GetDocSlice}
            />
          </Space>
        </div>

        {/*文件内容展示区*/}
        <div className="flex flex-row w-full h-full justify-between">
          {/*内容切片展示区 */}
          <div className="flex flex-col w-full h-full mt-8 items-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p>Loading...</p>
              </div>
            ) : (docSlice.length === 0? (
              <div className="flex flex-col items-center justify-center h-full">
                <p>暂无内容</p>
              </div>
            ) : (
              <>
                {docSlice.map((slice) => (
                  <Card key={slice.chunk_id} style={{ width: "100%" }}>
                    <p>{slice.content}</p>
                  </Card>
                ))}
                <Pagination
                  className="mt-4 justify-end  border-gray-300"
                  current={page}
                  pageSize={10}
                  total={totalSlice}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                />
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileShowPage;
