/* eslint-disable import/no-commonjs */
import _ from 'lodash';
module.exports = {
  indexName: 'dotconferences',
  playlists: [
    'PLMW8Xq7bXrG4OC1CZW7m-davg4p4ZCBmZ', // dotSwift 2018

    'PLMW8Xq7bXrG4gs_BDyI7q009IVDUMQRXB', // dotJS 2017
    'PLMW8Xq7bXrG7acNjsU5YMGl5MMK5gl2vn', // dotGo 2017
    'PLMW8Xq7bXrG7xzLo4j6bDznWzH7ZDc3wx', // dotSecurity 2017
    'PLMW8Xq7bXrG4AcSG9ZcqvMQSp6f0C7mi5', // dotSwift 2017
    'PLMW8Xq7bXrG78Xxnlxov8N_M9mNUN-1Ny', // dotCSS 2017
    'PLMW8Xq7bXrG7fNNYHvpeagKHw4DaUkgud', // dotScale 2017
    'PLMW8Xq7bXrG6-vlD0QFfFf0oi5vtTDcmQ', // dotAI 2017

    'PLMW8Xq7bXrG6tcAXDsAVATUbrflLOsIG_', // dotGo 2016
    'PLMW8Xq7bXrG7AAvnkys8joKEq8uMGykx7', // dotScale 2016
    'PLMW8Xq7bXrG7XSuKb3M3bSJ4d1XM0Z-gI', // dotCSS 2016
    'PLMW8Xq7bXrG7rZnRaYCel_RJY5yAXLQ2H', // dotJS 2016
    'PLMW8Xq7bXrG4jymjKULrw5_yEvK3uzATe', // dotSecurity 2016

    'PLMW8Xq7bXrG70G62mxQR0OC4GkUcNLRnC', // dotJS 2015
    'PLMW8Xq7bXrG5kujoYQdw94ip3cnV4WR59', // dotCSS 2015
    'PLMW8Xq7bXrG4Vw-JAnBmqA2IqzM2sf2Na', // dotGo 2015
    'PLMW8Xq7bXrG64KRc6PC0JLWFX2ygzFJDG', // dotScale 2015

    'PLMW8Xq7bXrG5B_oW-EX8AuLDG0BCwouis', // dotCSS 2014
    'PLMW8Xq7bXrG4bTkovexbhgrcD8BVyHmiS', // dotJS 2014
    'PLMW8Xq7bXrG58Qk-9QSy2HRh2WVeIrs7e', // dotGo 2014
    'PLMW8Xq7bXrG4pl13YVsKkaAUDeLdnrEQZ', // dotScale 2014

    'PLMW8Xq7bXrG6ZItH9Oq2tceeTS0fjXyii', // dotRB 2013
    'PLMW8Xq7bXrG77SV1VAAiAciRyq3VSC2Gq', // dotJS 2012
    'PLMW8Xq7bXrG486Mh95hKjiXRdci60zUlL', // dotJS 2013
    'PLMW8Xq7bXrG7XGG29sXso2hYYNW_14s_A', // dotScale 2013
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Get conference name from the playlist title
    record = helper.enrich(record, 'playlist.title', '{conference.name} {_}');

    // Extract speaker name and video title from title
    record = helper.enrich(
      record,
      'video.title',
      '{_} - {_speaker_} - {video.title}'
    );

    return record;
  },
};
