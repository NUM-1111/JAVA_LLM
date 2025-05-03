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

type DocUpdateEnable struct {
	DocID     int64 `json:"docId,string"`
	IsEnabled bool  `json:"is_enabled"`
}

type DocUpdateName struct {
	DocID   int64  `json:"docId,string"`
	DocName string `json:"doc_name"`
}
