import { message } from 'antd'
import axios from 'axios'

// Actions
const FETCH_MOCK_COL = 'yapi/mockCol/FETCH_MOCK_COL'

// Reducer
const initialState = {
  list: [],
}

export default (state = initialState, action) => {
  switch (action.type) {
    case FETCH_MOCK_COL:
      return {
        ...state,
        list: action.payload.data,
      }
    default:
      return state
  }
}

// Action Creators
export async function fetchMockCol(interfaceId) {
  const res = await axios.get('/api/advmock/case/list?interface_id=' + interfaceId)

  const resData = res.data
  if (resData.errcode !== 0) {
    message.error(resData.errmsg)
  }

  return {
    type: FETCH_MOCK_COL,
    payload: resData.data,
  }
}
