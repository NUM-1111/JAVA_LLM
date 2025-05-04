import requests

base_url = "http://127.0.0.1:8080"

email = "2654559534@qq.com"

# 登录
r = requests.post(base_url+"/api/login",json={"account":"pcx001","password":"pcx001"}).json()
print(r)

headers = {
     "Authorization":r["session_id"]
}

url = base_url + f"/api/knowledge/document/detail?docId=myTI&limit=5&offset=5&search="
# 查询文件切片
r = requests.get(url,headers=headers).json()
print(r)