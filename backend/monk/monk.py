import requests

# 测试注册
register = {
    "email":"2654559534@hrbeu.edu.cn",
    "username":"pcx001",
    "password":"pcx001"
}
base_url = "http://127.0.0.1:8080"
r = requests.post(base_url+"/register",json=register).json()
print(r)

#登录测试
login = {
    "username":"pcx001",
    "password":"pcx001"
}
r = requests.post(base_url+"/login",json=login).json()
print(r)

session_id = r.get("session_id")

# 测试更改用户名
data = {
    "username":"pcx003"
}
cookies = {
    "session_id":session_id
}
r = requests.post(base_url+"/api/change/username",json=data,cookies=cookies).json()
print(r)