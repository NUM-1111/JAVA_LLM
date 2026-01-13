import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DocSideBar from "./document/SideBar";
import { Button, Space, Table, Input, Switch, Pagination, message } from "antd";
import { docColumns } from "./document/model";
import { ReloadOutlined } from "@ant-design/icons";
import { AddIcon } from "@/components/svg-icons";
import DeleteDocModal from "./document/DeleteModal";
import axios from "axios";
import dayjs from "dayjs";
import UploadDocModal from "./document/UploadModal";
import { MatchFileType } from "./document/utils";
import RenameDocModal from "./document/RenameModal";

const { Search } = Input;

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

function DatasetPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  // params
  const navigate = useNavigate();
  const query = useQuery();
  const baseId = query.get("baseId");
  const [baseinfo, setBaseInfo] = useState({});
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
  const [uploadOpen, setuploadOpen] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [renameId, setRenameId] = useState(null);

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

  // 获取文件列表
  const GetFileList = async () => {
    try {
      setLoading(true);
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
      // 后端返回格式: {code: 200, msg: "success", data: {total: number, data: [...]}}
      const responseData = res.data.data || {};
      const data = responseData.data || [];
      const total = responseData.total || 0;
      const files = data.map((prev) => {
        const createdAt = dayjs(prev.created_at);
        prev.created_at = createdAt.format("YYYY-MM-DD HH:mm:ss");
        prev.file_type = MatchFileType(prev.file_type);
        return prev;
      });
      setFileList(files);
      setPagination({ ...pagination, total: total });
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
    } finally {
      setLoading(false);
    }
  };

  const onEnableChange = async (docId, checked) => {
    const postdata = {
      docId: docId,
      is_enabled: checked,
    };
    try {
      const res = await axios.post(
        `/api/knowledge/document/change/status`,
        postdata,
        {
          headers: {
            Authorization: localStorage.auth,
          },
        }
      );
      if (res.status === 200) {
        messageApi.success(res.data.msg);
        // 请求成功：更新状态
        const newList = fileList.map((item) =>
          item.docId === docId ? { ...item, is_enabled: checked } : item
        );
        setFileList(newList);
      }
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
        "请求失败,请稍后再试 !";
      messageApi.error(msg);
    }
  };

  useEffect(() => {
    GetBaseInfo();
  }, []);

  useEffect(() => {
    GetFileList();
  }, [pagination.current, doSearch, refresh]);

  return (
    <>
      {contextHolder}
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
        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col p-5 gap-4">
          <div className="mt-[2.07rem]">
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
                  setPagination({ ...pagination, current: 1 });
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
            <Button type="primary" onClick={() => setuploadOpen(true)}>
              <AddIcon />
              上传文件
            </Button>
            <UploadDocModal
              open={uploadOpen}
              onCancel={() => setuploadOpen(false)}
              baseId={baseId}
              onRefresh={() => setRefresh((prev) => prev + 1)}
              messageApi={messageApi}
            />
          </div>
          <div className="overflow-y-auto border rounded-t-md shadow-sm">
            <Table
              bordered
              rowKey="docId"
              loading={loading}
              pagination={false}
              columns={[
                ...docColumns,
                {
                  title: "启用",
                  dataIndex: "is_enabled",
                  key: "is_enabled",
                  width: 100,
                  align: "center",
                  render: (_, record) => {
                    return (
                      <Switch
                        checked={record.is_enabled}
                        defaultValue={record.is_enabled}
                        onChange={(checked) =>
                          onEnableChange(record.docId, checked)
                        }
                      />
                    );
                  },
                },
                {
                  title: "操作",
                  key: "org_operation",
                  fixed: "right",
                  width: 120,
                  align: "center",
                  render: (_, record) => (
                    <div className="flex flex-row justify-center">
                      <Button
                        type="link"
                        onClick={() => setRenameId(record.docId)}
                      >
                        重命名
                      </Button>
                      <RenameDocModal
                        open={renameId === record.docId}
                        docId={record.docId}
                        doc_name={record.doc_name}
                        onCancel={() => setRenameId(null)}
                        onRefresh={() => setRefresh((prev) => prev + 1)}
                        messageApi={messageApi}
                      />
                      <Button
                        type="link"
                        className="!text-red-500"
                        onClick={() => setDeleteId(record.docId)}
                      >
                        删除
                      </Button>
                      <DeleteDocModal
                        open={deleteId === record.docId}
                        baseId={baseId}
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
          <div className="flex justify-end pb-2">
            <Pagination
              current={pagination.current}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onChange={(current) =>
                setPagination({
                  ...pagination,
                  current: current,
                })
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default DatasetPage;
