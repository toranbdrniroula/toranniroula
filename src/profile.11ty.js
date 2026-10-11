const {profileData} = require('../tools/profile-data.cjs');
module.exports=class {
  data() {
    const profiles=['about','contact'].map(profileData);
    return {pagination:{data:'profiles',size:1,alias:'profile'},profiles,layout:'layouts/profile.njk',eleventyComputed:{
      permalink:data=>`/${data.profile.kind}.html`,
      ...Object.fromEntries(Object.keys(profiles[0]).map(key=>[key,data=>data.profile[key]]))
    }};
  }
  render(){return '';}
};
