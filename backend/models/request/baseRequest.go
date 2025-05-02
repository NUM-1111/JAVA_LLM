package request

type BaseCreateRequest struct {
	BaseName string `json:"base_name"`
	BaseDesc string `json:"base_desc,omitempty"`
}

type BaseUpdateRequest struct {
	BaseID   int64  `json:"base_id,string"`
	BaseName string `json:"base_name"`
	BaseDesc string `json:"base_desc,omitempty"`
}

type DocDeleteRequest struct {
	BaseID int64 `json:"base_id,string"`
	DocID  int64 `json:"doc_id,string"`
}
