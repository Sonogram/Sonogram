const gulp = require('gulp')
const exec = require('child_process').exec
const path = require('path')
const rename = require('gulp-rename')

gulp.task('grammar', ['binPath'], () => {
    return gulp.src('grammar/src/*.ne')
        .pipe(gexec(`${nearleyc} <%= file.path %>`, {pipeStdout: true}))
        .pipe(rename(path => { path.extname = ".js" }))
        .pipe(gulp.dest('grammar/dist'))
});

