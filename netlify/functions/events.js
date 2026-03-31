// netlify/functions/events.js
const events = {
  fullmoon: new Map(),
  mirage: new Map(),
  rip_indra: new Map(),
  darkbeard: new Map(),
  soul_reaper: new Map(),
  dough_king: new Map(),
  cursed_captain: new Map(),
  prehistoric: new Map(),
  shizu: new Map(),
  saishi: new Map(),
  oroshi: new Map(),
  snow_white: new Map(),
  pure_red: new Map(),
  winter_sky: new Map(),
};

const API_TOKEN = process.env.API_TOKEN || 'MoonLightAPI1234@#';
const TTL_MS = 30 * 60 * 1000; // 30 phút

function cleanup(type) {
  const now = Date.now();
  for (const [id, ts] of events[type]) {
    if (now - ts > TTL_MS) {
      events[type].delete(id);
    }
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Lấy type từ URL: /events/fullmoon hoặc /events/rip_indra
  const pathParts = event.path.split('/').filter(Boolean);
  let type = pathParts[pathParts.length - 1]?.toLowerCase();

  const validTypes = Object.keys(events);

  if (!type || !validTypes.includes(type)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid or missing type', 
        valid_types: validTypes 
      }),
    };
  }

  // ==================== POST - Thêm Job ID ====================
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      let { job_id, token } = body;

      // Hỗ trợ token qua header
      if (!token && event.headers.authorization) {
        token = event.headers.authorization.replace('Bearer ', '').trim();
      }

      if (token !== API_TOKEN) {
        console.log(`❌ Token sai cho ${type}`);
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: invalid token' }) };
      }

      if (!job_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing job_id' }) };
      }

      events[type].set(job_id, Date.now());
      cleanup(type);

      console.log(`✅ [POST] ${type} | job_id=${job_id} | count=${events[type].size}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          type, 
          job_id,
          count: events[type].size 
        }),
      };
    } catch (e) {
      console.error('POST error:', e.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ==================== GET - Trả về format giống NightHub ====================
  if (event.httpMethod === 'GET') {
    cleanup(type);

    const jobIds = Array.from(events[type].keys());

    const dataArray = jobIds.map(jobId => ({
      Age: Math.floor(Math.random() * 180) + 10,   // Age ngẫu nhiên (giống NightHub)
      JobId: jobId,
      Name: "Unknown",                              // Có thể thay bằng tên event sau
      PlaceId: 7449423635,                          // PlaceId của Blox Fruits (có thể chỉnh)
      Players: Math.floor(Math.random() * 18) + 2,
      Sea: "Sea3"
    }));

    const response = {
      count: dataArray.length,
      data: dataArray,
      last_update: Date.now() / 1000
    };

    console.log(`✅ [GET] ${type} | count=${dataArray.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  }

  // ==================== DELETE ====================
  if (event.httpMethod === 'DELETE') {
    try {
      const params = event.queryStringParameters || {};
      let { job_id, token } = params;

      if (!token && event.headers.authorization) {
        token = event.headers.authorization.replace('Bearer ', '').trim();
      }

      if (token !== API_TOKEN) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: invalid token' }) };
      }

      if (!job_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing job_id' }) };
      }

      const deleted = events[type].delete(job_id);
      console.log(`🗑️ [DELETE] ${type} | job_id=${job_id}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted, type, job_id }),
      };
    } catch (e) {
      console.error('DELETE error:', e.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
