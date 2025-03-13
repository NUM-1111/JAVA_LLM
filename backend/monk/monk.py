import requests

base_url = "http://127.0.0.1:8080"

#邮箱验证码测试
r = requests.post(base_url+"/send/email/code",json={"email":"2654559534@qq.com"}).json()
print(r)
code = input("输入邮箱验证码:")

# 测试注册
register = {
    "email":"2654559534@qq.com",
    "username":"pcx001",
    "password":"pcx001",
    "code":code
}

r = requests.post(base_url+"/register",json=register).json()
print(r)

#登录测试
login = {
    "username":"pcx004",
    "password":"pcx001"
}
r = requests.post(base_url+"/login",json=login).json()
print(r)

session_id = r.get("session_id")

'''# 测试更改用户名
data = {
    "username":"pcx004"
}
cookies = {
    "session_id":session_id
}
r = requests.post(base_url+"/api/change/username",json=data,cookies=cookies).json()
print(r)'''