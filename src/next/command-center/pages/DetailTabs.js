/*
 * DetailTabs.js: the tabs below the map. Each page passes its own tabs: Channel Orders and Archy
 * Ordered Items on a segment's page, all of them on a store's page. The tabs are the map's layer
 * tabs (components/PillTabs.js).
 */
import React from 'react';

import PillTabs from '../components/PillTabs';

export default function DetailTabs({ tabs, tab, onTab, where }) {
  const open = tabs.find((item) => item.key === tab) || tabs[0];
  return (
    <div className="cc-bottom">
      <div className="cc-tabs">
        <PillTabs value={open.key} onChange={onTab} items={tabs} label="Details" />
        <span className="cc-tabs-where">{where}</span>
      </div>
      {open.render()}
    </div>
  );
}
