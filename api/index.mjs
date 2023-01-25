import ld2 from './routes/ld2.mjs';
import query from './routes/query.mjs';

export default (app, fields) => {
  
  ld2(app);
  query(app);
	
  //GraphQL

  return app
}