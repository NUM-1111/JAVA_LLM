package request

type BaseCreateRequest struct {
	BaseName string `json:"base_name"`
	BaseDesc string `json:"base_desc,omitempty"`
}

type BaseUpdateRequest struct {
	BaseID   int64  `json:"baseId,string"`
	BaseName string `json:"base_name"`
	BaseDesc string `json:"base_desc,omitempty"`
}

type DocDeleteRequest struct {
	BaseID int64 `json:"baseId,string"`
	DocID  int64 `json:"docId,string"`
}
