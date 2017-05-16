const VKApi = require('node-vkapi');
const download = require('image-downloader')
const CONFIG = require('./config')

const photoTest = new RegExp('photo_');

const loadPhotos = (id, offset = 0, count = 200)  => VK.call('photos.getAll', { owner_id: id, extended: 0, offset, count })

const getUrls = function(items) {
    return items.reduce((photos, photo) => {
        let keys = Object.keys(photo).filter((item) => photoTest.test(item))
        keys.sort((a, b) => {
            const aV = parseInt(a.replace('photo_',''))
            const bV = parseInt(b.replace('photo_', ''))
            if (aV === bV) { return 0 }
            return aV > bV ? -1 : 1
        })
        const key = keys[0]
        key && photos.push(photo[key])
        return photos
    }, [])
}

const loadAllPhotos = function(tokenID = null, offset = 0, userPhotosArr = []) {
    return new Promise(function loader(resolve, reject) {
        loadPhotos(tokenID, offset).then(data => {
            userPhotosArr = userPhotosArr.concat(data.items)
            offset += 200
            if (0 >= data.count - offset) {
                return resolve(userPhotosArr)
            }
            return loadAllPhotos(tokenID, offset, userPhotosArr).then(resolve)
        }).catch(reject)
    })
}

const downloadPhotos = function(photos) {
    return new Promise(function(resolve, reject) {
        let url = photos.shift()
        download
                .image({ url , dest: CONFIG.DOWNLOAD_PATH })
                .then(() => {
                    console.log(`${url} was saved`)
                    if (!photos.length) {
                        return resolve()
                    }
                    return downloadPhotos(photos)
                                .then(resolve)
                                .catch(reject)
                })
                .catch((err) => {
                    console.error(`${url} wasn't saved`, err)
                    reject()
                })
    })
}

const VK = new VKApi({ app: CONFIG.app, auth: CONFIG.auth })
VK.auth.user({ scope: ['photos'] })
.then(token => loadAllPhotos(token.user_id))
.then(getUrls)
.then(photos => {
    console.log(`==== Count: ${photos.length} === `)
    return photos
})
.then(downloadPhotos)
.then(() => console.log('Done.'))
