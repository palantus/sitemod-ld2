import ld2 from './routes/ld2.mjs';
import exp from './routes/export.mjs';

export default (app, fields) => {
  
  ld2(app);
  exp(app);
	
  //GraphQL

  return app
}