import Link from 'next/link';

import Footer from '../../components/Footer';
import Layout, { GradientBackground } from '../../components/Layout';
import ArrowIcon from '../../components/ArrowIcon';
import { getGlobalData } from '../../utils/global-data';

import { parseProperties } from '../../api/parse-properties';
import { getAllUsers, queryDatabase } from '../../api/query-database';
import { any } from 'cypress/types/bluebird';
import { UserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import Image from 'next/image';
import { useContext, useEffect, useMemo, useState } from 'react';
import { GlobalContext } from '../../utils/context';
import { NextSeo } from 'next-seo';
import { FormattedDate, FormattedMessage, useIntl } from 'react-intl';
import { GoogleDirectory } from '../../api/client';
import { admin_directory_v1 } from 'googleapis';
import { useRouter } from 'next/router';
import MemberCard from '../../components/MemberCard';

type IndexProps = {
  //users: UserObjectResponse[];
  users: admin_directory_v1.Schema$User[];
  photos: admin_directory_v1.Schema$UserPhoto[];
  groups: admin_directory_v1.Schema$Groups;
  memberships: { [x: string]: admin_directory_v1.Schema$Members };
};

export async function getStaticProps() {
  //var users = [];
  //try {
  //  users = (await getAllUsers()).results.filter(
  //    (user) => user.type === 'person'
  //  );
  //} catch (e) {
  //  console.error(e);
  //}
  try {

    await GoogleDirectory.groups.list({
      domain: 'jef.gal'
    }).then((res) => {
      return res.data.groups;
    });

    const users = await GoogleDirectory.users.list({
      domain: 'jef.gal',
      orderBy: 'GIVEN_NAME',
      showDeleted: 'false',
      //viewType: 'domain_public',
    }).then((res) => {
      return res.data.users;
    }
    );

    const photos = await Promise.all(users.map((u) =>
      GoogleDirectory.users.photos.get({
        userKey: u.primaryEmail,
      }).then((res) => {
        return res.data;
      }).catch((e) => {
        return null;
      })
    ));

    const groups = await GoogleDirectory.groups.list({
      domain: 'teams.jef.gal',
    }).then((res) => {
      return res.data;
    });

    const memberships = await Promise.all(groups.groups.map(async (g) => ({
      [g.id]: await GoogleDirectory.members.list({
        groupKey: g.email,
        includeDerivedMembership: true,
      }).then((res) => res.data)
    }))).then((res) => {
      return res.reduce((acc, membership) => {
        return { ...acc, ...membership }; // Merge all the objects into one
      }
        , {});
    }
    );
    return { props: { users, photos, groups, memberships }, revalidate: 14400 }; // revalidate every 4 hours
  } catch (e) {
    return { props: { users: [], photos: [], groups: [], memberships: [] }};
  }
}

export default function Index({ users, photos, memberships, groups }: IndexProps) {
  const intl = useIntl();
  const router = useRouter();

  return (
    <main className="w-full">
      <NextSeo
        title={intl.formatMessage({ defaultMessage: 'Sobre JEF Galicia' })}
        description={intl.formatMessage({
          defaultMessage: 'Información sobre JEF Galicia e os seus membros',
        })}
      />
      {/*<h1 className="text-3xl text-center mb-6 mt-12">
                Sobre a Federación
            </h1>
    <button type="submit" className='inline-block text-sm px-4 py-2 leading-none border rounded transition text-black border-black dark:border-white dark:hover:border-transparent dark:text-white border-opacity-30 hover:border-transparent hover:text-white hover:bg-primary mt-4 lg:mt-0'>{'Inscribirme 💌'}</button>*/}
      <h1 className="text-3xl text-center mb-6">
        <FormattedMessage defaultMessage="Sobre nós" />
      </h1>
      <p className="text-center mb-6">
        <FormattedMessage defaultMessage="Somos un equipo de persoas activas que traballamos por unha Europa máis unida." />
      </p>
      <p className="text-center mb-12">
        <FormattedMessage defaultMessage="Todas nós somos persoas voluntarias, cunha paixón compartida pola Unión Europea e Galicia. A nosa labor desinteresada busca promover unha sociedade máis aberta, igualitaria, libre, democrática e xusta." />
      </p>
      <ul className="w-full">
        {users.filter(u => !u.suspended).sort((u1, u2) => new Date(u1.creationTime).getTime() - new Date(u2.creationTime).getTime()).map((user) => {
          const tagline = groups.groups.filter((group) => memberships[group.id]?.members?.find((memb) => memb.email === user.primaryEmail)).map((group) => group.name + ' Manager').join(', ');
          return (
            <li
              key={user.id}
              className="md:first:rounded-t-lg md:last:rounded-b-lg backdrop-blur-lg bg-white dark:bg-black dark:bg-opacity-30 bg-opacity-10 hover:bg-opacity-20 dark:hover:bg-opacity-50 transition border border-gray-800 dark:border-white border-opacity-10 dark:border-opacity-10 border-b-0 last:border-b hover:border-b hovered-sibling:border-t-0"
            //onClick={(e) => {
            //  router.push('/about/members/' + user.primaryEmail);
            //}}
            >

              <MemberCard user={user} photo={photos.find(p => p && p.primaryEmail === user.primaryEmail)}
                tagline={tagline} />
            </li>)
        }
        )}
      </ul>
    </main>
  );
}
