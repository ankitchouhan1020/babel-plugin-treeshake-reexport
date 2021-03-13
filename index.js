var types = require('@babel/types');
var pathLib = require('path');

function isImportSpecifier(type) {
  return type === 'ImportSpecifier'
}

function relativeToCwd(filename) {
  if (!pathLib.isAbsolute(filename)) {
    filename = pathLib.resolve(__dirname, filename);
  }
  return pathLib.relative(process.cwd(), filename);
}

const importMoudleTransformVisitor = function (innerPath) {
  const parentState = this.state;
  console.log('import declaration called')
  const transforms = [];

  const memberImports = innerPath.node.specifiers.filter(specifier => isImportSpecifier(specifier.type));
  const source = innerPath.node.source && innerPath.node.source.value;

  memberImports.forEach(memberImport => {
    const importName = memberImport.imported.name;
    const replacementSource = parentState.file.moduleMap[importName] && parentState.file.moduleMap[importName].path;

    if (source === replacementSource) {
      return;
    }
    
    if (replacementSource) {
      transforms.push(types.importDeclaration(
        [memberImport],
        types.stringLiteral(replacementSource)
      ));
    }
  });

  if (transforms.length) {
    path.replaceWithMultiple(transforms);
  }
}

const exportModuleMapGeneratorVisitor = function (innerPath) {
  const parentState = this.state;
  const source = innerPath.node.source && innerPath.node.source.value;
  const specifiers = innerPath.node.specifiers;

  if (!source) {
    return;
  }

  // TODO: Change filename to state.filename
  const currentFile = relativeToCwd(parentState.filename);

  specifiers.forEach(specifier => {
    const alias = specifier.exported.name;
    const modulePath = pathLib.relative(process.cwd(), pathLib.resolve(currentFile, source));
    parentState.file.moduleMap[alias] = {
      path: modulePath
    }
  })

  console.log({ moduleMap: JSON.stringify(parentState.file.moduleMap) });
}


module.exports = function () {
  return {
    pre(state) {
      state.moduleMap = {}
    },
    visitor: {
      Program(path, state) {
        path.traverse({
          ExportNamedDeclaration: exportModuleMapGeneratorVisitor
        }, { path, state })
        path.traverse({
          ImportDeclaration: importMoudleTransformVisitor
        }, { path, state })
      }
    }
  }
}