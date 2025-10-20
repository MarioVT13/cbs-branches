import axios from 'axios';

export const http = axios.create({ timeout: 10000 });

http.interceptors.request.use((config) => {
	console.log(`[HTTP] → ${config.method?.toUpperCase()} ${config.url}`);
	return config;
});
http.interceptors.response.use(
	(res) => {
		console.log(`[HTTP] ← ${res.status} ${res.config.url}`);
		return res;
	},
	(err) => {
		const status = err?.response?.status ?? 'NO_RESPONSE';
		console.log(`[HTTP] × ${status} ${err?.config?.url} :: ${err?.message}`);
		return Promise.reject(err);
	},
);
