package services

import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
	hashed_pwd, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed_pwd), nil
}
