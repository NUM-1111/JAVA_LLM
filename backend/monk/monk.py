import requests

base_url = "http://127.0.0.1:8080"

email = "2654559534@qq.com"

# # 登录
# r = requests.post(base_url+"/login",json={"account":"pcx001","password":"pcx001"}).json()
# print(r)

# headers = {
#      "Authorization":r["session_id"]
# }
# # 注销用户
# r = requests.post(base_url+"/api/delete/account",headers=headers).json()
# print(r)

#邮箱验证码测试
r = requests.post(base_url+"/send/email",json={"email":email}).json()
print(r)

code = input("输入邮箱验证码:")

# 测试注册
register = {
    "email":email,
    "username":"pcx001",
    "password":"pcx001",
    "code":code
}

r = requests.post(base_url+"/register",json=register).json()
print(r)

headers = {
     "Authorization":r["session_id"]
}
# 注销用户
r = requests.post(base_url+"/api/delete/account",headers=headers).json()
print(r)

