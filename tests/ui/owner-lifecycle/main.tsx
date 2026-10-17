import {createRoot} from 'react-dom/client';import {ConfigProvider} from 'antd';import ptBR from 'antd/locale/pt_BR';
import {OrganizationsPage} from '../../../web/src/pages/OrganizationsPage';
import {PrismaViewStateProvider} from '../../../web/src/ui/PrismaNavigation';import {PrismaLoadingFeedback} from '../../../web/src/ui/PrismaLoadingFeedback';import {prismaTheme} from '../../../web/src/ui/theme';
import '../../../web/src/styles.css';import '../../../web/src/ui/foundation.css';
const profile=new URLSearchParams(location.search).get('profile')==='recruiter'?'recruiter':'super_admin';
createRoot(document.getElementById('app')!).render(<ConfigProvider theme={prismaTheme} locale={ptBR}><PrismaViewStateProvider scope="synthetic-super"><div style={{padding:24}}><OrganizationsPage profile={profile} onNavigate={path=>{(window as any).__navigation=path;}} onChanged={async()=>{}}/><PrismaLoadingFeedback/></div></PrismaViewStateProvider></ConfigProvider>);
