import app from './app';
import { getRequiredEnvVar } from './utils/getRequiredEnvVar';


const port = getRequiredEnvVar('PORT');

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
