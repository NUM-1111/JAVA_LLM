import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DocSideBar from "./document/SideBar";
import { Button, Space, Table, Input, message } from "antd";
import { docColumns } from "./document/model";
import { ReloadOutlined } from "@ant-design/icons";
import { AddIcon } from "@/components/svg-icons";
import DeleteDocModal from "./document/DeleteModal";
import axios from "axios";
import dayjs from "dayjs";

const { Search } = Input;

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

function DatasetPage() {
  const [messageApi, contextHolder] = message.useMessage();
  // params
  const navigate = useNavigate();
  const query = useQuery();
  const baseId = query.get("baseId");
  // filedata
  const [fileList, setFileList] = useState([]);
  // search
  const [searchText, setSearchText] = useState("");
  const [doSearch, setDoSearch] = useState(0);
  // refesh
  const [refresh, setRefresh] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  // operations
  const [deleteId, setDeleteId] = useState(null);

  const GetFileList = async () => {
    try {
      const res = await axios.get(`/api/knowledge/document/list`, {
        headers: {
          Authorization: localStorage.auth,
        },
        params: {
          search: searchText,
          baseId: baseId,
          limit: pagination.pageSize,
          offset: (pagination.current - 1) * pagination.pageSize,
        },
      });
      const data = res.data.data || [];
      const files = data.map((prev) => {
        const createdAt = dayjs(prev.created_at);
        prev.create_at = createdAt.format("YYYY-MM-DD HH:mm:ss");
        return prev;
      });
      setFileList(files);
      setPagination((prev) => ({
        ...prev,
        total: res.data.total,
      }));
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem("auth");
        messageApi.error("请求失败,请重新登录!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
        return;
      }
      const msg =
        err.response?.data?.error ||
        err.response?.data?.msg ||
        "获取数据失败,请稍后再试 !";
      messageApi.error(msg);
    }
  };

  useEffect(() => {
    GetFileList();
  }, [pagination.pageSize, doSearch, refresh]);

  return (
    <>
      {contextHolder}
      <div className="flex flex-row h-screen">
        <div className="flex flex-col h-full w-64 mx-4">
          <div className="flex flex-col h-1/4 items-center justify-center">
            <p className="text-lg font-bold">测试知识库</p>
            <p className="text-gray-600">这是知识库的描述文本</p>
          </div>
          <div
            className="flex-grow border-t border-gray-300 border-dashed my-1"
            style={{
              borderTopStyle: "dashed",
              borderTopWidth: "2.2px",
              borderImage: "none",
            }}
          ></div>
          <div className="flex flex-col h-3/4 overflow-auto justify-between">
            <DocSideBar />
            <Button
              type="primary"
              className="mb-14 mx-4"
              onClick={() => navigate("/knowledge")}
            >
              返回主页
            </Button>
          </div>
        </div>
        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col p-5 gap-4">
          <div className="mt-10">
            <p className="text-base font-bold">数据集</p>
            <p className="text-sm">解析成功后才能在聊天时使用 😉</p>
          </div>
          <div className="border-t border-gray-200 my-1"></div>
          <div className="flex flex-row justify-between mr-2">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索文件名称"
                value={searchText}
                onSearch={() => {
                  setDoSearch((prev) => prev + 1);
                  setPagination((prev) => ({ ...prev, current: 1 }));
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchText(value);
                }}
                allowClear
                enterButton
                style={{ width: 300 }}
              />

              <Button
                type="primary"
                onClick={() => {
                  setSearchText("");
                  setPagination({ ...pagination, current: 1 });
                  setRefresh((prev) => prev + 1);
                }}
              >
                重置
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setRefresh((prev) => prev + 1);
                }}
              >
                刷新
              </Button>
            </Space>
            <Button type="primary">
              <AddIcon />
              上传文件
            </Button>
          </div>
          <div className="overflow-y-hidden border rounded-t-md shadow-sm">
            <Table
              rowKey="docId"
              columns={[
                ...docColumns,
                {
                  title: "操作",
                  key: "org_operation",
                  fixed: "right",
                  width: 100,
                  align: "center",
                  render: (_, record) => (
                    <div className="flex flex-row justify-center">
                      <Button type="link">重命名</Button>

                      <Button
                        type="link"
                        className="!text-red-500"
                        onClick={() => setDeleteId(record.docId)}
                      >
                        删除
                      </Button>
                      <DeleteDocModal
                        open={deleteId === record.docId}
                        docId={record.docId}
                        onRefresh={() => setRefresh((prev) => prev + 1)}
                        onCancel={() => setDeleteId(null)}
                        messageApi={messageApi}
                      />
                    </div>
                  ),
                },
              ]}
              dataSource={fileList}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default DatasetPage;
