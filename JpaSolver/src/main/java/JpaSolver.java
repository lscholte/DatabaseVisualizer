import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.expr.MemberValuePair;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;
import com.github.javaparser.symbolsolver.javaparsermodel.JavaParserFacade;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class JpaSolver
{
    static CombinedTypeSolver typeSolver;

    public static void main(String[] args) throws FileNotFoundException
    {
        File dir = new File(args[0]);
        if (!dir.isDirectory()) {
            System.exit(1);
        }

        typeSolver = new CombinedTypeSolver();
        typeSolver.add(new ReflectionTypeSolver());
        typeSolver.add(new JavaParserTypeSolver(dir));

        Iterator<File> fileIterator = FileUtils.iterateFiles(dir, new String[]{"java"}, true);
        while (fileIterator.hasNext()) {
            File f = fileIterator.next();

            CompilationUnit cu = JavaParser.parse(f);
            EntityVisitor ev = new EntityVisitor();
            ev.visit(cu, null);
            if (ev.isEntity && ev.hasRelations) {
                System.out.println(f.getName());
            }
        }

    }

    private static class EntityVisitor extends VoidVisitorAdapter<Void>
    {
        boolean isEntity = false;
        boolean hasRelations = false;

        String tableName;
        String className;
        List<Relation> relations = new ArrayList<>();

        static class Relation
        {
            enum Type
            {
                NoRelation,
                ManyToOne,
                OneToMany,
                OneToOne,
                ManyToMany
            }

            Type type;
            String columnName;
            String referencedEntityClass;

            Relation(Type type, String columnName)
            {
                this.type = type;
                this.columnName = columnName;
            }
        }

        @Override
        public void visit(ClassOrInterfaceDeclaration c, Void arg)
        {
            // Ignore any non-entity files
            if (!c.isAnnotationPresent("Entity"))
                return;

            tableName = c.getAnnotationByName("Table").map(a -> a.getChildNodes().stream()
                .filter(n -> n instanceof MemberValuePair).map(n -> (MemberValuePair) n)
                .filter(mvp -> mvp.getNameAsString().equals("name")).map(mvp -> mvp.getValue().toString().replace("\"", ""))
                .findAny().orElse(null)).orElse(c.getNameAsString());

            className = JavaParserFacade.get(typeSolver).getTypeDeclaration(c).getQualifiedName();

            // Continue visiting to get fields and stuff
            isEntity = true;
            super.visit(c, arg);
        }

        @Override
        public void visit(FieldDeclaration f, Void arg)
        {
            if (!isEntity)
                return;

            VariableDeclarator v = f.getVariables().stream().findAny().orElse(null);
            if (v == null) {
                super.visit(f, arg);
                return;
            }

            Relation r = new Relation(Relation.Type.NoRelation, null);
            NodeList<AnnotationExpr> annotations = f.getAnnotations();
            annotations.forEach(a -> {
                switch (a.getNameAsString()) {
                    case "ManyToOne":
                        r.type = Relation.Type.ManyToOne;
                        break;
                    case "OneToMany":
                        r.type = Relation.Type.OneToMany;
                        break;
                    case "OneToOne":
                        r.type = Relation.Type.OneToOne;
                        break;
                    case "ManyToMany":
                        r.type = Relation.Type.ManyToMany;
                        break;
                    case "JoinColumn":
                        r.columnName = a.getChildNodes().stream()
                            .filter(n -> n instanceof MemberValuePair).map(n -> (MemberValuePair) n)
                            .filter(mvp -> mvp.getNameAsString().equals("name")).map(mvp -> mvp.getValue().toString())
                            .findAny().orElse(r.columnName);
                        break;
                }
            });

            // If this is a real relation add it to our list
            if (r.type != Relation.Type.NoRelation) {
                // If we haven't set our reference column name yet, set it to the variable name
                r.columnName = v.getNameAsString();

                // Also figure out the class of the referenced table
                r.referencedEntityClass = JavaParserFacade.get(typeSolver).getType(v).describe();

                relations.add(r);
                hasRelations = true;
            }

            super.visit(f, arg);
        }
    }
}
