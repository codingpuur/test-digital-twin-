import Head from 'next/head'

import { Landing } from '@/components/interfaces/Landing/Landing'
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/brand'
import type { NextPageWithLayout } from '@/types'

// In mock-backend builds `/` is the public landing page. Other builds redirect it
// (see redirects.shared.ts), so this page is never reached there.
const LandingPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>{`${PRODUCT_NAME} | ${PRODUCT_TAGLINE}`}</title>
      <meta name="description" content={PRODUCT_DESCRIPTION} />
      <meta property="og:title" content={`${PRODUCT_NAME} | ${PRODUCT_TAGLINE}`} />
      <meta property="og:description" content={PRODUCT_DESCRIPTION} />
      <meta property="og:type" content="website" />
    </Head>
    <Landing />
  </>
)

export default LandingPage
