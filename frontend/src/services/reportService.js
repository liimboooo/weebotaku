import api from './api';

const reportService = {
  submit: (data) => api.post('/reports', data),
};

export default reportService;
