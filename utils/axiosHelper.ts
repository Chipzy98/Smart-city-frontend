import axios from "axios";

export const axiosGetFromApiAsync = async (url: string) => {
  const response = await axios.get(url);
  return response.data;
};

export const axiosPostToApiAsync = async <T>(url: string, data: T) => {
  const response = await axios.post(url, data);
  return response.data;
};